import * as Events from './Events';
import { INavigationPanelOptions, NavigationPanelOptions } from './Options';
import { EditorContext } from './EditorContext';
import { modalConfirmCancelQuestion } from './Modal';

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param editorContext
 * @param options
 */
export function createNavigationPanel(
  element: HTMLElement,
  editorContext: EditorContext,
  options?: INavigationPanelOptions,
  mainEditorElement?: HTMLElement
) {
  const defaultOptions = new NavigationPanelOptions();
  const effectiveOptions = {
    ...defaultOptions,
    ...options,
  };

  const idPrefix = `fusebit-nav-${Math.floor(99999999 * Math.random()).toString(26)}`;
  const addButtonId = `${idPrefix}-add-file`;
  const codeCategoryId = `${idPrefix}-code`;
  const newFileId = `${idPrefix}-new-file`;
  const newFileNameId = `${idPrefix}-new-file-name`;
  const treeId = `${idPrefix}-tree`;

  let isDeletingFile: string | undefined;

  let html: string[] = [];
  html.push(`<div id="${treeId}" class="fusebit-nav">`);
  if (!effectiveOptions.hideCode) {
    html.push(
      `<div id="${codeCategoryId}" class="fusebit-nav-category">Code`,
      `<button id="${addButtonId}" class="fusebit-code-action-add-btn"><i class="fa fa-plus"></i></button></div>`
    );
    if (editorContext.functionSpecification && editorContext.functionSpecification.nodejs) {
      const fileNames = Object.keys(editorContext.functionSpecification.nodejs.files).sort();
      for (const fileName of fileNames) {
        if ((effectiveOptions.hideFiles as string[]).indexOf(fileName) < 0) {
          html.push(createFileNameNavigationItemHtml(fileName));
        }
      }
    }
    html.push(
      `<div id="${newFileId}" style="display:none" class="fusebit-nav-new-file">`,
      `<span class="fusebit-nav-icon"><i class="fa fa-file"></i></span>`,
      `<input id="${newFileNameId}" placeholder="" size="15" class="fusebit-new-file-input">`,
      `</span></div>`
    );
    html.push(`<div>&nbsp;</div>`);
  }
  if (
    !effectiveOptions.hideComputeSettings ||
    !effectiveOptions.hideConfigurationSettings ||
    !effectiveOptions.hideScheduleSettings ||
    !effectiveOptions.hideRunnerTool
  ) {
    html.push(`<div class="fusebit-nav-category">Settings</div>`);
    if (!effectiveOptions.hideComputeSettings) {
      html.push(
        `<div class="fusebit-nav-item" data-type="computeSettings">`,
        `<span class="fusebit-nav-icon"><i class="fa fa-tools"></i></span>`,
        `<span class="fusebit-compute-file">Compute</span>`,
        `</div>`
      );
    }
    if (!effectiveOptions.hideConfigurationSettings) {
      html.push(
        `<div class="fusebit-nav-item" data-type="configurationSettings">`,
        `<span class="fusebit-nav-icon"><i class="fa fa-cogs"></i></span>`,
        `<span class="fusebit-compute-file">Configuration</span>`,
        `</div>`
      );
    }
    if (!effectiveOptions.hideScheduleSettings) {
      html.push(
        `<div class="fusebit-nav-item" data-type="scheduleSettings">`,
        `<span class="fusebit-nav-icon"><i class="fa fa-clock"></i></span>`,
        `<span class="fusebit-compute-file">Schedule</span>`,
        `</div>`
      );
    }
    if (!effectiveOptions.hideRunnerTool) {
      html.push(
        `<div class="fusebit-nav-item" data-type="runnerSettings">`,
        `<span class="fusebit-nav-icon"><i class="fa fa-play"></i></span>`,
        `<span class="fusebit-compute-file">Runner</span>`,
        `</div>`
      );
    }
  }
  html.push('</div>'); // fusebit-nav

  // Insert into DOM and attach events

  element.innerHTML = html.join('');
  let treeElement = document.getElementById(treeId) as HTMLElement;
  let navItems = treeElement.getElementsByClassName('fusebit-nav-item');
  for (var i = 0; i < navItems.length; i++) {
    if (navItems[i].classList.contains('fusebit-nav-file')) {
      attachFileNameNavigationItemEvents(navItems[i] as HTMLElement);
    } else {
      navItems[i].addEventListener('click', navigationItemClicked);
    }
  }

  let addButton = document.getElementById(addButtonId) as HTMLElement;
  let codeCategory = document.getElementById(codeCategoryId) as HTMLElement;
  addButton.addEventListener('click', addButtonClicked);
  let newFileNameElement = document.getElementById(newFileNameId) as HTMLInputElement;
  newFileNameElement.addEventListener('keyup', newFileNameKeyup);

  editorContext.on(Events.Events.FileAdded, (e: Events.FileAddedEvent) => {
    let insertAfter: HTMLElement | undefined;
    let navigationItems = treeElement.getElementsByClassName('fusebit-nav-file');
    for (var i = 0; i < navigationItems.length; i++) {
      if ((navigationItems[i].getAttribute('data-file') as string) > e.fileName) {
        break;
      } else {
        insertAfter = navigationItems[i] as HTMLElement;
      }
    }

    let html = createFileNameNavigationItemHtml(e.fileName);
    if (insertAfter) {
      insertAfter.insertAdjacentHTML('afterend', html);
    } else {
      codeCategory.insertAdjacentHTML('afterend', html);
    }
    let element = findFileNameNavigationItemElement(e.fileName) as HTMLElement;
    attachFileNameNavigationItemEvents(element);
    selectNavigationItem(element);
    editorContext.selectFile(e.fileName);
  });

  editorContext.on(Events.Events.FileDeleted, (e: Events.FileDeletedEvent) => {
    let element = findFileNameNavigationItemElement(e.fileName);
    if (element) {
      element.remove();
      let firstFileElement = treeElement.getElementsByClassName('fusebit-nav-file')[0] as HTMLElement;
      if (firstFileElement) {
        selectNavigationItem(firstFileElement);
        editorContext.selectFile(firstFileElement.getAttribute('data-file') as string);
      }
    }
  });

  editorContext.on(Events.Events.FileSelected, (e: Events.FileSelectedEvent) => {
    let element = findFileNameNavigationItemElement(e.fileName);
    if (element) {
      selectNavigationItem(element);
    }
  });

  let newFileElement = document.getElementById(newFileId) as HTMLElement;
  function addButtonClicked(e: Event) {
    e.preventDefault();
    newFileElement.style.display = 'unset';
    newFileNameElement.value = '';
    newFileNameElement.focus();
    detectClickOutsideElement(
      newFileElement,
      () => {
        newFileElement.style.display = 'none';
      },
      e
    );
  }

  // Functions

  function deleteButtonClicked(fileName: string) {
    return function deleteButtonClickedCore(e: Event) {
      e.preventDefault();
      isDeletingFile = fileName;
      modalConfirmCancelQuestion(mainEditorElement || element, `<div>Delete<br>${fileName}?</div>`, confirm => {
        if (confirm) {
          let tmp = isDeletingFile;
          isDeletingFile = undefined;
          editorContext.deleteFile(tmp as string);
        }
      });
    };
  }

  function createFileNameNavigationItemHtml(fileName: string) {
    let html = [
      `<div class="fusebit-nav-item fusebit-nav-file" data-type="file" data-file="${fileName}">`,
      `<span><span class="fusebit-nav-icon"><i class="fa fa-file"></i></span>${fileName}</span>`,
      fileName === 'index.js'
        ? `<span></span>`
        : `<button class="fusebit-code-action-delete-btn"><i class="fa fa-trash"></i></button>`,
      `</div>`,
    ];
    return html.join('');
  }

  function attachFileNameNavigationItemEvents(element: HTMLElement) {
    element.addEventListener('click', navigationItemClicked);
    let deleteButton = element.getElementsByClassName('fusebit-code-action-delete-btn')[0];
    if (deleteButton) {
      (deleteButton as HTMLElement).addEventListener(
        'click',
        deleteButtonClicked(element.getAttribute('data-file') as string)
      );
    }
  }

  function findFileNameNavigationItemElement(fileName: string): HTMLElement | undefined {
    let navigationItems = treeElement.getElementsByClassName('fusebit-nav-file');
    for (var i = 0; i < navigationItems.length; i++) {
      if (navigationItems[i].getAttribute('data-file') === fileName) {
        return navigationItems[i] as HTMLElement;
      }
    }
    return undefined;
  }

  function newFileNameKeyup(e: KeyboardEvent) {
    if (e.which === 13 || e.keyCode === 13) {
      // enter
      endAddingNewFile(newFileNameElement.value as string);
    } else if (e.which === 27 || e.keyCode === 27) {
      // escape
      endAddingNewFile();
    }
  }

  let outsideClickListener: ((event: Event) => any) | undefined;
  function detectClickOutsideElement(element: HTMLElement, cb: () => void, trigger?: Event) {
    if (!mainEditorElement) {
      return;
    }
    if (outsideClickListener) {
      throw new Error('Only one outsideClickListener supported at a time.');
    }
    outsideClickListener = (event: Event) => {
      if (!element.contains(event.target as Node) && isVisible(element) && trigger !== event) {
        cancelDetectionOfClickOutsideElement();
        cb();
      }
    };

    const isVisible = (elem: HTMLElement) =>
      !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);

    mainEditorElement.addEventListener('click', outsideClickListener);
  }

  function cancelDetectionOfClickOutsideElement() {
    if (outsideClickListener && mainEditorElement) {
      mainEditorElement.removeEventListener('click', outsideClickListener);
      outsideClickListener = undefined;
    }
  }

  function endAddingNewFile(fileName?: string) {
    newFileElement.style.display = 'none';
    cancelDetectionOfClickOutsideElement();
    if (fileName) {
      if (editorContext.functionSpecification.nodejs && editorContext.functionSpecification.nodejs.files[fileName]) {
        // file exists, select it
        let element = findFileNameNavigationItemElement(fileName);
        if (element) {
          selectNavigationItem(element);
        }
      } else {
        editorContext.addFile(fileName);
      }
    }
  }

  function navigationItemClicked(e: Event) {
    e.preventDefault();
    let currentElement = e.currentTarget as HTMLElement;
    if (currentElement.classList.contains('fusebit-nav-item-selected')) {
      return;
    }
    if (
      currentElement.classList.contains('fusebit-nav-file') &&
      !findFileNameNavigationItemElement(currentElement.getAttribute('data-file') as string)
    ) {
      // file no longer exists
      return;
    }
    if (isDeletingFile) {
      return;
    }

    selectNavigationItem(currentElement);
    let nodeType = currentElement.getAttribute('data-type');
    switch (nodeType) {
      case 'file':
        editorContext.selectFile(currentElement.getAttribute('data-file') as string);
        break;
      case 'computeSettings':
        editorContext.selectSettingsCompute();
        break;
      case 'configurationSettings':
        editorContext.selectSettingsConfiguration();
        break;
      case 'runnerSettings':
        editorContext.selectToolsRunner();
        break;
      case 'scheduleSettings':
        editorContext.selectSettingsSchedule();
        break;
    }
  }

  function selectNavigationItem(element: HTMLElement) {
    let selectedElements = treeElement.getElementsByClassName('fusebit-nav-item-selected');
    for (var i = 0; i < selectedElements.length; i++) {
      selectedElements[i].classList.remove('fusebit-nav-item-selected');
    }
    element.classList.add('fusebit-nav-item-selected');
  }

  return element;
}
