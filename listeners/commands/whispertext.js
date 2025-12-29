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

export { whisper };