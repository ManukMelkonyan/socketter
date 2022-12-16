let ws = new WebSocket('ws://localhost:8080');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');

const sendTextButton = document.getElementById('send-text-btn');
const sendFileButton = document.getElementById('send-file-btn');
const connectButton = document.getElementById('connect-btn');

ws.onmessage = (event) => {
  console.log(event);
}


sendTextButton.addEventListener('click', (e) => {
  const data = messageInput.value;
  ws.send(data);
});

sendFileButton.addEventListener('click', (e) => {
  console.log(fileInput.files[0]);
  const data = fileInput.files[0];
  ws.send(data);
});

connectButton.addEventListener('click', (e) => {
  ws = new WebSocket('ws://localhost:8080');
  ws.onmessage = (event) => {
    console.log(event);
  }  
})