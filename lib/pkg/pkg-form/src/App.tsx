import { useState } from 'react';

import './App.css';
import { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';

import { materialRenderers, materialCells } from '@jsonforms/material-renderers';

const schema = { XXXSCHEMAXXX: 'XXX' } as JsonSchema;

const uischema = ({ XXXUISCHEMAXXX: 'XXX' } as unknown) as UISchemaElement;

const initialData = { XXXINITIALDATAXXX: 'XXX' };

function App() {
  const [data, setData] = useState(initialData);

  return (
    <div className="App">
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={data}
        renderers={materialRenderers}
        cells={materialCells}
        onChange={({ data }) => setData(data)}
      />
    </div>
  );
}

export default App;
