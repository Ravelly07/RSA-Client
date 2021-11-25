const {io} = require('socket.io-client');
const repl = require('repl');
const fs = require('fs');
const NodeRSA = require('encrypt-rsa').default;
const prompt = require('prompt-sync')();
const socket = io('http://localhost:5000');

const KeysArray = []
const nodeRSA = new NodeRSA();
let privateKeysGenerate = '';

const generateRSAkeys = (username) =>{
    const { privateKey, publicKey } = nodeRSA.createPrivateAndPublicKeys();
    fs.writeFileSync(`./keys/private-key-${username}`, privateKey);
    fs.writeFileSync(`./keys/public-key-${username}`, publicKey);
  
    return publicKey;
};

const storePubKeys = (pubkey, username) => {
    socket.on('joinRoom:shareKeys', (keys) => {
      keys.forEach((key) => {
        //console.log("El servidor ha almacenado una llave publica!");
        let tmpKey = key.toString();
        if (tmpKey !== pubkey) {
          KeysArray.push(key);
          fs.writeFileSync(`./keys/sharedKeyFor-${username}`, key);
          console.log(`Se ha guardado una llave publica de otro usuario!`);//(`Public Key has been stored: ${key}`);
        }
      });
    });
  };
  
  const encryptMessage = (message, username) => {
    return nodeRSA.encryptStringWithRsaPublicKey({
      text: message,
      keyPath: `./keys/sharedKeyFor-${username}`,
    });
  };
  
  const decryptMessage = (message, username) => {
    return nodeRSA.decryptStringWithRsaPrivateKey({
      text: message,
      keyPath: `./keys/private-key-${username}`,
    });
  };

  // Chat Funtions

const welcome = () => {
    socket.on('joinRoom:welcome', (message) => {
      console.log(message.text);
    });
  };
  
  const newUser = () => {
    socket.on('joinRoom:newUser', (message) => {
      console.log(message.text);
    });
  };
  
  const receiveMessage = () => {
    socket.on('chat:message', (message) => {
      console.log(`${message.username}: ${message.text.message} `);
    });
  };
  
  const sendMessage = () => {
    repl.start({
      prompt: '',
      eval: (message) => {
        socket.emit('chat', { message });
      },
    });
  };
  
  // Encrypt N Decrypt
  
  const sendEncryptedMessage = (username) => {
    repl.start({
      prompt:`- ` ,//`${username}: `,
      eval: (message) => {
        message = encryptMessage(message, username);
        socket.emit('chat', { message });
      },
    });
  };
  
  const receiveDecryptedMessage = (username) => {
    socket.on('chat:message', (message) => {
      const decryptedMessage = decryptMessage(message.text.message, username);
      console.log(`${message.username}: ${decryptedMessage} `);
    });
  };

  // Main Function

const joinRoom = () => {
    console.clear();
    const username = prompt('Username: ');
    const roomname = prompt('Room to join: ');
    const pubkey = generateRSAkeys(username);
  
    if (username !== '' && roomname !== '' && pubkey !== '') {
      socket.emit('joinRoom', { username, roomname, pubkey });
    } else {
      console.error('You should enter all the data');
    }
  
    welcome();
    newUser();
    storePubKeys(pubkey, username);
    //receiveMessage();
    //sendMessage();
    receiveDecryptedMessage(username);
    sendEncryptedMessage(username);
  };
  
  joinRoom();