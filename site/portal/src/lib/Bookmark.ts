const BookmarkKey = 'fusebitBookmark';

function setBookmark(path: string) {
  if (path) {
    window.localStorage.setItem(BookmarkKey, path);
  } else {
    window.localStorage.removeItem(BookmarkKey);
  }
}

function getBookmark(): string | undefined {
  let path = window.localStorage.getItem(BookmarkKey);
  window.localStorage.removeItem(BookmarkKey);
  return path || undefined;
}

export { setBookmark, getBookmark };
