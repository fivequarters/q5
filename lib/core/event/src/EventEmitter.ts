export interface Event {
  name: string;
}

export interface EventListener<T extends Event> {
  (event: T): void;
}

export class EventEmitter {
  private listeners: { [property: string]: EventListener<Event>[] } = {};

  public on<T extends Event>(event: string, listener: EventListener<T>) {
    this.addListener(event, listener);
  }

  public once<T extends Event>(event: string, listener: EventListener<T>) {
    const wrapped = (data: T) => {
      this.removeListener(event, wrapped);
      listener(data);
    };
    this.on(event, wrapped);
  }

  public addListener<T extends Event>(event: string, listener: EventListener<T>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener as EventListener<Event>);
  }

  public removeListener<T extends Event>(event: string, listener: EventListener<T>) {
    if (this.listeners[event]) {
      let index = this.listeners[event].indexOf(listener as EventListener<Event>);

      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  emit<T extends Event>(data: T) {
    const listeners = this.listeners[data.name];
    if (listeners) {
      for (const listener of listeners.slice()) {
        listener(data);
      }
    }
  }
}
