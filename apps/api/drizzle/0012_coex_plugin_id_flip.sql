UPDATE channel_accounts
  SET plugin_id = 'meta-whatsapp-coex'
  WHERE plugin_id = 'meta-whatsapp'
    AND credentials->>'channelMode' = 'coexistence';
