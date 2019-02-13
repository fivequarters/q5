import React, { useState, useLayoutEffect } from 'react';
import styled from 'styled-components';

//A 55 55 0 0 1 105 55 v 50 h -50
// C ${center[0] - 50} ${center[1] + 100} ${connect[0] - 0} ${connect[1] + 50} ${connect[0]} ${connect[1]}`}

//  Q ${center[0] + connect[0]} ${center[1] + connect[1]} ${center[0] + connect[2]} ${center[1] + connect[3]}
//T${connect[4]} ${connect[5]}`}

// V ${connect[1]}

function Cylinder({ center, height, width, stroke, fill, strokeWidth, connect, accent }: any) {
  const halfWidth = width / 2;
  const upperCenter = [center[0], center[1] - height / 2];
  const upperLeft = [center[0] - halfWidth, center[1] - height / 2];
  const lowerRight = [center[0] + halfWidth, center[1] + height / 2];

  const output = [center[0] - width / 4, center[1] - height / 12];
  const input = [center[0] + width / 4, center[1] + height / 2.5];

  let arcX;
  let abc;
  let inputConnect = [0, 0];

  if (connect) {
    inputConnect = [connect[0] + width / 4, connect[1] + height / 2.5];
    arcX = (center[0] + connect[0]) / 2 - center[0] + 20;
    abc = center[1] > inputConnect[1] ? center[1] + 200 - inputConnect[1] / 4 : inputConnect[1] + 200 - center[1] / 4;
  }

  const connectPath = connect ? (
    <path
      d={`M ${output[0]} ${output[1]} 
          a ${20} ${20} 0 0 0 ${-20} ${20}
          V ${abc}
          A ${arcX} ${arcX} 0 0 ${center[0] < inputConnect[0] ? 0 : 1} ${inputConnect[0] + 20} ${abc}
          V ${inputConnect[1]}
          A ${20} ${20} 0 0 0 ${inputConnect[0]} ${inputConnect[1]}
      `}
      fill="none"
      stroke={stroke}
      strokeLinecap="round"
      strokeWidth={strokeWidth * 3}
    />
  ) : (
    <circle cx={output[0]} cy={output[1]} r={width / 30} fill={stroke} stroke={stroke} strokeWidth={strokeWidth} />
  );
  return (
    <>
      {/* <circle cx="55" cy="55" r="50" fill="transparent" stroke={color} strokeWidth={strokeWidth} /> */}
      <path
        d={`M ${upperLeft[0]} ${upperLeft[1]} 
            v ${height} 
            A ${halfWidth} ${halfWidth / 3.5} 0 0 0 ${lowerRight[0]} ${lowerRight[1]}
            v -${height}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <ellipse
        cx={upperCenter[0]}
        cy={upperCenter[1]}
        rx={halfWidth}
        ry={halfWidth / 3.5}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />

      <circle
        cx={output[0]}
        cy={output[1]}
        r={width / 12}
        fill="transparent"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />

      <circle cx={input[0]} cy={input[1]} r={width / 12} fill="transparent" stroke={stroke} strokeWidth={strokeWidth} />
      {connectPath}

      <circle
        cx={output[0] + width / 5}
        cy={output[1] - height / 12}
        r={width / 30}
        fill={accent}
        stroke={accent}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={output[0] + width / 5}
        cy={output[1] - height / 12 + height / 7}
        r={width / 30}
        fill={accent}
        stroke={accent}
        strokeWidth={strokeWidth}
      />
    </>
  );
}

export function AppGraphic() {
  return (
    <svg width={500} height={500} viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
      <Cylinder
        center={[200, 150]}
        connect={[100, 450]}
        height={150}
        width={180}
        stroke="black"
        fill="white"
        accent="red"
        strokeWidth={5}
      />

      {/* <Cylinder
        center={[650, 200]}
        connect={[400, 300]}
        height={150}
        width={180}
        stroke="black"
        fill="white"
        accent="red"
        strokeWidth={5}
      /> */}
      {/* <Cylinder
        center={[400, 300]}
        connect={[750, 400]}
        height={150}
        width={180}
        stroke="black"
        fill="white"
        accent="red"
        strokeWidth={5}
      />
      <Cylinder
        center={[750, 400]}
        connect={[600, 500]}
        height={150}
        width={180}
        stroke="black"
        fill="white"
        accent="red"
        strokeWidth={5}
      /> */}
      <Cylinder
        center={[100, 450]}
        connect={[300, 550]}
        height={150}
        width={180}
        stroke="black"
        fill="white"
        accent="red"
        strokeWidth={5}
      />
      {/* <Cylinder
        center={[600, 500]}
        connect={[300, 550]}
        height={150}
        width={180}
        stroke="black"
        fill="white"
        accent="red"
        strokeWidth={5}
      />
      <Cylinder center={[300, 550]} height={150} width={180} stroke="black" fill="white" accent="red" strokeWidth={5} /> */}
      {/* <Cylinder
        center={[550, 200]}
        connect={[50, 50, 50, 50, 50, 50, 650, 650]}
        height={150}
        width={180}
        stroke="black"
        fill="white"
        accent="red"
        strokeWidth={5}
      />
      <Cylinder
        center={[350, 350]}
        connect={[50, 50, 50, 50, 50, 50, 650, 650]}
        height={150}
        width={180}
        stroke="black"
        fill="white"
        accent="red"
        strokeWidth={5}
      />

      <Cylinder center={[650, 650]} height={150} width={180} stroke="black" fill="white" accent="red" strokeWidth={5} /> */}
    </svg>
  );
}
