const messy = async ({ ack, body, client, command }) => {
  await ack();
  const userText = body.text;
  const channel = command.channel_id;
  const username = command.user_id;

  const display = await client.users.profile.get({
    user: username,
  });

  let displayname = display.profile.display_name;
  if (displayname == "") {
    displayname = display.profile.real_name;
  }

  const backarr = {"a": "ɒ", "b": "d", "c": "ɔ", "d": "b", "e": "ɘ", "f": "ʇ", "g": "ϱ", "h": "⑁", "i": "i", "j": "ᒑ", "k": "ʞ", "l": "l", "m": "m", "n": "n", "o": "o", "p": "q", "q": "p", "r": "ɿ", "s": "ƨ", "t": "ɟ", "u": "u", "v": "v", "w": "w", "x": "x", "y": "γ", "z": "z", 
        "A": "A", "B": "ᗺ", "C": "Ɔ", "D": "ꓷ", "E": "Ǝ", "F": "ꟻ", "G": "ວ", "H": "H", "I": "I", "J": "ᒐ", "K": "ꓘ", "L": "⅃", "M": "M", "N": "И", "O": "O", "P": "ᑫ", "Q": "Ϙ", "R": "Я", "S": "Ƨ", "T": "T"};
  const downarr = {"a": "ɐ", "b": "q", "c": "ɔ", "d": "p", "e": "ǝ", "f": "ɟ", "g": "ƃ", "h": "ɥ", "i": "ı̣", "j": "ɾ̣", "k": "ʞ", "l": "ן", "m": "ɯ", "n": "u", "o": "o", "p": "d", "q": "b", "r": "ɹ", "s": "s", "t": "ʇ", "u": "n", "v": "ʌ", "w": "ʍ", "x": "x", "y": "ʎ", "z": "z", 
        "A": "Ɐ", "B": "ꓭ", "C": "Ɔ", "D": "ꓷ", "E": "Ǝ", "F": "Ⅎ", "G": "ꓨ", "H": "H", "I": "I", "J": "ſ", "K": "ꓘ", "L": "ꓶ", "M": "W", "N": "N", "O": "O", "P": "Ԁ", "Q": "Ꝺ", "R": "ꓤ", "S": "S", "T": "ꓕ", "U": "ꓵ", "V": "ꓥ", "W": "M", "X": "X", "Y": "⅄", "Z": "Z"};
  let text = "";

  if (Math.random() < 0.666) {
    const random = Math.random()
    if (random < 0.3333) {
      for (let j = userText.length - 1; j >= 0; j--) {
        text += userText[j];
      }
    } else if (random < 0.6666) {
      if (Math.random() < 0.5) {
        for (let j = userText.length - 1; j >= 0; j--) {
          text += backarr[userText[j]] || userText[j];
        }
      } else {
        for (let j = 0; j < userText.length; j++) {
          text += backarr[userText[j]] || userText[j];
        }
      }
    } else {
      if (Math.random() < 0.5) {
        for (let j = userText.length - 1; j >= 0; j--) {
          text += downarr[userText[j]] || userText[j];
        }
      } else {
        for (let j = 0; j < userText.length; j++) {
          text += downarr[userText[j]] || userText[j];
        }
      }
    }
  } else {
    if (Math.random() < 0.5) {
      for (let j = userText.length - 1; j >= 0; j--) {
        const rand1 = Math.random();
        if (rand1 < 0.33333) {
          text += downarr[userText[j]] || userText[j];
        } else if (rand1 < 0.66666) {
          text += backarr[userText[j]] || userText[j];
        } else {
          text += userText[j];
        }
      }
    } else {
      for (let j = 0; j < userText.length; j++) {
        const rand1 = Math.random();
        if (rand1 < 0.33333) {
          text += downarr[userText[j]] || userText[j];
        } else if (rand1 < 0.66666) {
          text += backarr[userText[j]] || userText[j];
        } else {
          text += userText[j];
        }
      }
    }
  }

  if (Math.random() < 0.6) {
    const words = text.split(' ');
    text = words.map(word => {
      const rand2 = Math.random();
      if (rand2 < 0.25) {
        return ("*" + word + "*");
      } else if (rand2 < 0.5) {
        return ("_" + word + "_");
      } else if (rand2 < 0.75) {
        return ("~" + word + "~");
      } else {
        return word;
      }
    }).join(' ');
  }

  await client.chat.postMessage({
    channel: channel,
    text: text,
    username: displayname,
    thread_ts: command.thread_ts,
    icon_url: display.profile.image_512,
  });
};

const whisper = async ({ ack, body, client, command}) => {
    await ack();
    const mytext = body.text;
    console.log("Text: ", body.text);
    const channel = command.channel_id;
    const username = command.user_id;

    const arr = mytext.split("> ");
    const usertosend = arr[0].split("|")[0].split("@")[1];
    arr.shift();
    const userText = arr.join("> ");

    const display = await client.users.profile.get({
      user: username,
    });

    let displayname = display.profile.display_name;
    if (displayname == "") {
      displayname = display.profile.real_name;
    }

    await client.chat.postEphemeral({
      channel: channel,
      text: userText,
      user: usertosend,
      username: displayname,
      icon_url: display.profile.image_512,
    });
}

export { messy, whisper };