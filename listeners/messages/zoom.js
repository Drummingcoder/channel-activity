const nextminute = async ({ message, client, say, logger }) => {
  try {
    // Ignore bot messages
    if (message.bot_id || message.subtype === 'bot_message') {
      return;
    }
    
    // Calculate the next full minute
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);
    
    // Convert to Unix timestamp (in seconds)
    const postAt = Math.floor(nextMinute.getTime() / 1000);
    
    await client.chat.scheduleMessage({
      channel: message.channel,
      text: "oneminutelaterpastnonececil934",
      post_at: postAt
    });
    
    logger.info(`Scheduled message for ${nextMinute.toISOString()}`);
  } catch (error) {
    logger.error('Error in nextminute handler:', error);
  }
};

export { nextminute };

