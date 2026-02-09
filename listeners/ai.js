const runAi = async ({ message, client, logger }) => {
  try {
    const channelToPost = message.channel;
    const timestamp = message.thread_ts;
    const mess = message.text;
    const user = message.user;

    const response = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer YOUR_API_KEY',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'qwen/qwen3-32b',
            messages: [
            { 
                role: 'system', 
                content: 'You are the engine for a Rock Paper Scissors game. Only respond with who wins.' 
            },
            { 
                role: 'user', 
                content: 'Rock vs Scissors' 
            }
            ]
        }),
        });

        const data = await response.json();
        const botReply = data.choices[0].message.content;

    console.log(data);

  } catch (error) {

  }
}

export { runAi };