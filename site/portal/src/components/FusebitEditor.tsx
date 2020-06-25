import React from 'react';

export default class FusebitEditor extends React.Component<any> {
  private el: any;
  private editorContext: any;

  render() {
    return <div style={{ width: '100%', height: '100%' }} ref={(el) => (this.el = el)} />;
  }

  componentDidMount() {
    const initializeEditor = () => {
      //@ts-ignore
      window.fusebit
        .createEditor(this.el, this.props.boundaryId, this.props.functionId, this.props.account, this.props.options)
        .then((editorContext: any) => {
          this.editorContext = editorContext;
          if (this.props.onLoaded) {
            this.props.onLoaded(editorContext);
          }
        })
        .catch((e: any) => {
          if (this.props.onError) {
            this.props.onError(e);
          } else {
            throw e;
          }
        });
    };
    let fusebitLibUrl = `https://cdn.fusebit.io/fusebit/js/fusebit-editor/${(this.props.version || 'latest').replace(
      /\./g,
      '/'
    )}/fusebit-editor.min.js`;
    let hasFusebitLib;
    for (let i = 0; i < document.scripts.length; i++) {
      if (document.scripts[i].src === fusebitLibUrl) {
        hasFusebitLib = true;
        break;
      }
    }
    if (hasFusebitLib) {
      return initializeEditor();
    }
    let script = document.createElement('script');
    script.src = fusebitLibUrl;
    script.async = true;
    script.onload = () => initializeEditor();
    document.head.appendChild(script);
  }

  componentWillUnmount() {
    if (this.editorContext) {
      this.editorContext.dispose();
      this.editorContext = undefined;
    }
  }
}
