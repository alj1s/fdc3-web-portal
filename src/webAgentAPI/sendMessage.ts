import {
  FDC3MessageData,
  FDC3ReturnMessage,
  FDC3SendMessageResolution,
  ListenerItem,
  ContextMessage
} from "@/common/types";
import { TOPICS } from "@/common/topics";
import { guid } from "@/common/util";
import { Context } from '@finos/fdc3';
import { RegisterInstanceReturn } from "@/common/types";


export class FDC3LocalInstance {

  instanceId : string | undefined;

  returnHandlers: Map<string, any> = new Map();

  constructor() {

  }

  initConnection = async () => {
    this.setListener();
    const registrationResult = await this.sendMessage("registerInstance");
    const instanceId = (registrationResult.data as RegisterInstanceReturn)
      .instanceId;
    console.log("*** API setting instanceId ", instanceId);
    this.instanceId = instanceId;
  }

  contextListeners: Map<string, ListenerItem> = new Map();

  intentListeners: Map<string, Map<string, ListenerItem>> = new Map();

  setListener = () => {
    window.addEventListener("message", async (event: MessageEvent) => {
      const message: FDC3ReturnMessage = event.data || ({} as FDC3ReturnMessage);
      if (message.topic === TOPICS.CONTEXT && message.data) {
        const contextMessage : ContextMessage = message.data as ContextMessage;
    
        if (this.contextListeners.has(contextMessage.listenerId)){
          const listener = this.contextListeners.get(contextMessage.listenerId);
          listener?.handler?.call(this, (message.data as ContextMessage).context as Context);
        }
      }
  
      const returnHandlers = this.getReturnHandlers();
      if (returnHandlers.has(message.topic)) {
        return returnHandlers.get(message.topic).call(this, { data: message.data });
      }
    });
  }

  getReturnHandlers() : Map<string, any>  {
    return this.returnHandlers;
  }

  sendMessage(
    topic: string,
    data?: FDC3MessageData,
    handler?: any
  ): Promise<FDC3SendMessageResolution>  {
    return new Promise((resolve) => {
      const returnId = `${topic}_${guid()}`;
      const theHandler = async (message: FDC3ReturnMessage) => {
        if (handler) {
          resolve(await handler.call(this, data));
        }
        resolve({ data: message.data || {}, error: message.error });
      };
      this.returnHandlers.set(returnId, theHandler);
      const source = this.instanceId;
      //do everything through window messages?
      console.log('***API posting message', topic, source, data);
      window.top?.postMessage({
        topic,
        source,
        returnId,
        data,
      });
    });
  }

}


