export const confirmAction = ({
  title = "Confirm Action",
  content = "Are you sure you want to continue?",
} = {}) =>
  Promise.resolve(window.confirm(`${title}\n\n${content}`));

