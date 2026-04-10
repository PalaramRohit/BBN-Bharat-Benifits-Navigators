import { useEffect } from "react";

const BOTPRESS_INJECT_SRC = "https://cdn.botpress.cloud/webchat/v3.6/inject.js";
const BOTPRESS_BOT_SRC = "https://files.bpcontent.cloud/2026/03/07/15/20260307155549-SKP43WPR.js";

const INJECT_SCRIPT_ID = "bp-webchat-inject-script";
const BOT_SCRIPT_ID = "bp-webchat-bot-script";

export function BotpressWidget() {
  useEffect(() => {
    const mountBotScript = () => {
      if (document.getElementById(BOT_SCRIPT_ID)) return;

      const botScript = document.createElement("script");
      botScript.id = BOT_SCRIPT_ID;
      botScript.src = BOTPRESS_BOT_SRC;
      botScript.defer = true;
      document.body.appendChild(botScript);
    };

    const existingInject = document.getElementById(INJECT_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingInject) {
      mountBotScript();
      return;
    }

    const injectScript = document.createElement("script");
    injectScript.id = INJECT_SCRIPT_ID;
    injectScript.src = BOTPRESS_INJECT_SRC;
    injectScript.defer = true;
    injectScript.onload = () => {
      mountBotScript();
    };
    document.body.appendChild(injectScript);

    return () => {
      const botpress = (window as any).botpress;
      if (botpress?.destroy) {
        try {
          botpress.destroy();
        } catch {
          // no-op
        }
      }

      const botScript = document.getElementById(BOT_SCRIPT_ID);
      if (botScript) botScript.remove();

      const webchatIframe = document.getElementById("bp-web-widget");
      if (webchatIframe) webchatIframe.remove();
    };
  }, []);

  return null;
}

