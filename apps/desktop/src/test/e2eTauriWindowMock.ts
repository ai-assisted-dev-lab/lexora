const currentWindow = {
  minimize: () => Promise.resolve(),
  maximize: () => Promise.resolve(),
  unmaximize: () => Promise.resolve(),
  close: () => Promise.resolve(),
  isMaximized: () => Promise.resolve(false),
  onResized: () => Promise.resolve(() => {}),
};

export function getCurrentWindow() {
  return currentWindow;
}
