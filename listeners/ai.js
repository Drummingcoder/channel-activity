const runAi = async ({ message, client, logger }) => {
  try {
    const channelToPost = message.channel;
    const timestamp = message.thread_ts;
    const mess = message.text;
    const user = message.user;

    const response = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.HACKCLUB_AI_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'x-ai/grok-4.1-fast',
            messages: [
            { 
                role: 'system', 
                content: `As the character Sans from Undertale, please respond with a non-sensical retort to this message, and make it winter-themed. For example, if the message was Hello, you could say "Did you mean goodbye you snowman?" or you could say "What a boring greeting." Be creative and try to emulate how Sans would act, and choose a random emotion, like mean or playful. Limit your response to around two sentences of 20 words each (more or less).`
            },
            { 
                role: 'user', 
                content: `Here is the message to respond to: ${mess}.`
            }
            ]
        }),
        });

    const data = await response.json();
    const botReply = data.choices[0].message.content;
    console.log(data);

    await client.chat.postMessage({
        channel: channelToPost,
        thread_ts: timestamp,
        text: botReply
    });

  } catch (error) {
    logger.error(error);
  }
}

export { runAi };