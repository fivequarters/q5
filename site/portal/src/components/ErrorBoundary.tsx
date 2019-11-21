import React from "react";

interface IFusebitErrorAction {
  text: string;
  url: string;
}

interface IFusebitErrorOptions {
  details: string;
  actions?: IFusebitErrorAction[];
}

class FusebitError extends Error {
  public fusebit: IFusebitErrorOptions;
  constructor(message: string, options: IFusebitErrorOptions) {
    super(message);
    this.fusebit = options;
  }
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log the error to an error reporting service
  }

  render() {
    if (this.state.error) {
      if (this.state.error.fusebit) {
        const fusebitError = this.state.error as FusebitError;
        return (
          <div>
            <h1>{fusebitError.message}</h1>
            <p>{fusebitError.fusebit.details}</p>
            {fusebitError.fusebit.actions &&
              fusebitError.fusebit.actions.map(action => (
                <a href={action.url}>{action.text}</a>
              ))}
          </div>
        );
      } else {
        return (
          <div>
            <h1>Something went wrong</h1>
            <p>{this.state.error.message}</p>
          </div>
        );
      }
    }

    return this.props.children;
  }
}

export { FusebitError };
export default ErrorBoundary;
