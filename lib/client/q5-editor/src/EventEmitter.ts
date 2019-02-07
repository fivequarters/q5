import { Event } from './Events';

export interface EventListener {
    (event: Event): void;
}

interface EventListeners {
    [property: string]: EventListener[];
}

export class EventEmitter {

    events: EventListeners = {};

    on(event: string, listener: EventListener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }    
        this.events[event].push(listener);    
    }

    once(event: string, listener: EventListener) {
        let self = this;
        this.on(event, function g (data) {
            self.removeListener(event, g);
            listener(data);
        });
    }

    removeListener(event: string, listener: EventListener) {
        if (this.events[event]) {
            let idx = this.events[event].indexOf(listener);
    
            if (idx > -1) {
                this.events[event].splice(idx, 1);
            }
        }
    }

    emit(event: string, data: Event) {
        var i, listeners, length, args = [].slice.call(arguments, 1);
    
        if (this.events[event]) {
            let listeners = this.events[event].slice();
            let length = listeners.length;
    
            for (i = 0; i < length; i++) {
                listeners[i](data);
            }
        }
    }
}
