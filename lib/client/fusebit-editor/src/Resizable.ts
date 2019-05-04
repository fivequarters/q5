// This is an ES version of Rick Strahl's jquery-resizable from
// https://github.com/RickStrahl/jquery-resizable/blob/master/src/jquery-resizable.js

export function resizable(element: HTMLElement, handle: HTMLElement, options: any) {
  let defaultOptions = {
    // resize the width
    resizeWidth: true,
    // resize the height
    resizeHeight: true,
    // the side that the width resizing is relative to
    resizeWidthFrom: 'right',
    // the side that the height resizing is relative to
    resizeHeightFrom: 'bottom',
    // hook into start drag operation (event passed)
    onDragStart: null,
    // hook into stop drag operation (event passed)
    onDragEnd: null,
    // hook into each drag operation (event passed)
    onDrag: null,
    // disable touch-action on $handle
    // prevents browser level actions like forward back gestures
    touchActionNone: true,
  };

  var opt = {
    ...defaultOptions,
    ...options,
  };

  let startPos: any, startTransition: any;

  if (opt.touchActionNone) {
    handle.style.touchAction = 'none';
  }

  element.classList.add('resizable');
  handle.addEventListener('touchstart', startDragging);
  handle.addEventListener('mousedown', startDragging);

  function noop(e: Event) {
    e.stopPropagation();
    e.preventDefault();
  }

  function startDragging(e: Event) {
    // Prevent dragging a ghost image in HTML5 / Firefox and maybe others
    if (e.preventDefault) {
      e.preventDefault();
    }

    startPos = getMousePos(e);
    startPos.width = width(element);
    startPos.height = height(element);

    startTransition = element.style.transition;
    element.style.transition = 'none';

    if (opt.onDragStart) {
      if (opt.onDragStart(e, element, opt) === false) return;
    }

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDragging);
    //@ts-ignore
    if (window.Touch || navigator.maxTouchPoints) {
      document.addEventListener('touchmove', doDrag);
      document.addEventListener('touchend', stopDragging);
    }
    document.addEventListener('selectstart', noop); // disable selection
    let iframes = document.getElementsByName('iframe');
    iframes.forEach(x => {
      x.style.pointerEvents = 'none';
    });
  }

  function doDrag(e: Event) {
    var pos: any = getMousePos(e),
      newWidth: any,
      newHeight: any;

    if (opt.resizeWidthFrom === 'left') newWidth = startPos.width - pos.x + startPos.x;
    else newWidth = startPos.width + pos.x - startPos.x;

    if (opt.resizeHeightFrom === 'top') newHeight = startPos.height - pos.y + startPos.y;
    else newHeight = startPos.height + pos.y - startPos.y;

    if (!opt.onDrag || opt.onDrag(e, element, newWidth, newHeight, opt) !== false) {
      if (opt.resizeHeight) element.style.height = `${newHeight}px`;
      if (opt.resizeWidth) element.style.width = `${newWidth}px`;
    }
  }

  function stopDragging(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDragging);

    //@ts-ignore
    if (window.Touch || navigator.maxTouchPoints) {
      document.removeEventListener('touchmove', doDrag);
      document.removeEventListener('touchend', stopDragging);
    }
    document.removeEventListener('selectstart', noop);

    // reset changed values
    element.style.transition = startTransition;
    let iframes = document.getElementsByName('iframe');
    iframes.forEach(x => {
      x.style.pointerEvents = 'auto';
    });

    if (opt.onDragEnd) opt.onDragEnd(e, element, opt);

    return false;
  }

  function getMousePos(e: any) {
    var pos = { x: 0, y: 0, width: 0, height: 0 };
    if (typeof e.clientX === 'number') {
      pos.x = e.clientX;
      pos.y = e.clientY;
    } else if (e.originalEvent.touches) {
      pos.x = e.originalEvent.touches[0].clientX;
      pos.y = e.originalEvent.touches[0].clientY;
    } else return null;

    return pos;
  }
}

export function width(element: HTMLElement) {
  return +(window.getComputedStyle(element).width as string).replace('px', '');
}

export function height(element: HTMLElement) {
  return +(window.getComputedStyle(element).height as string).replace('px', '');
}
