export function modalConfirmCancelQuestion(
  container: HTMLElement,
  questionHtml: string,
  cb: (confirm: boolean) => void
) {
  let modalId = `fusebit-modal-${Math.floor(99999999 * Math.random()).toString(26)}`;
  let confirmId = `${modalId}-confirm`;
  let html: string[] = [];
  html.push(
    `<div id="${modalId}" class="fusebit-modal-container">`,
    `<div class="fusebit-modal">`,
    questionHtml,
    `<div class="fusebit-modal-confirm-cancel-container">`,
    `<button id="${confirmId}" class="fusebit-modal-action-btn"><i class="far fa-check-circle"></i></button>`,
    `<button class="fusebit-modal-action-btn"><i class="far fa-times-circle"></i></button>`,
    `</div>`,
    `</div>`,
    `</div>`
  );

  container.insertAdjacentHTML('beforeend', html.join(''));
  let modal = document.getElementById(modalId) as HTMLElement;
  let confirmButton = document.getElementById(confirmId) as HTMLElement;

  modal.addEventListener('click', (e) => done(e, false));
  confirmButton.addEventListener('click', (e) => done(e, true));

  function done(e: Event, confirm: boolean) {
    e.preventDefault();
    container.removeChild(modal);
    cb(confirm);
  }
}
