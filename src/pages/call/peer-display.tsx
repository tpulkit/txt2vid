import React, { forwardRef } from 'react';
import { Typography } from 'rmwc';

const PeerDisplay = forwardRef<HTMLCanvasElement, Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>>(({ style, ...props }, ref) => {
  return (
    <div style={{
      ...style,
      position: 'relative'
    }} {...props}>
      <canvas ref={ref} style={{

      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
      }}>
        <Typography use="body1">idfk</Typography>
      </div>
    </div>
  );
});

export default PeerDisplay;