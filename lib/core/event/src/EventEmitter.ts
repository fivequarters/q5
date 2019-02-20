export interface IEvent {
  name: string;
}

export type EventListener<T extends IEvent> = (event: T) => void;

export class EventEmitter {
  private listeners: { [property: string]: EventListener<IEvent>[] } = {};

  public on<T extends IEvent>(event: string, listener: EventListener<T>) {
    this.addListener(event, listener);
  }

  public once<T extends IEvent>(event: string, listener: EventListener<T>) {
    const wrapped = (data: T) => {
      this.removeListener(event, wrapped);
      listener(data);
    };
    this.on(event, wrapped);
  }

  public addListener<T extends IEvent>(event: string, listener: EventListener<T>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener as EventListener<IEvent>);
  }

  public removeListener<T extends IEvent>(event: string, listener: EventListener<T>) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(listener as EventListener<IEvent>);

      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  public emit<T extends IEvent>(data: T) {
    const listeners = this.listeners[data.name];
    if (listeners) {
      for (const listener of listeners.slice()) {
        listener(data);
      }
    }
  }
}
