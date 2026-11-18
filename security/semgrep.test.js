function renderMessage(node, value) {
  // ruleid: una-chat-dom-html
  node.innerHTML = value;
  // ruleid: una-chat-dom-html
  node.html(value);
  // ok: una-chat-dom-html
  node.textContent = value;
}
