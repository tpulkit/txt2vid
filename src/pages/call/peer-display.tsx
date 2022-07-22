import React, { forwardRef } from 'react';
import { Typography } from 'rmwc';
import { Peer } from '../../util';

const PeerDisplay = forwardRef<HTMLCanvasElement, Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> & {
  peer: Peer;
}>(({ style, peer, ...props }, ref) => {
  return (
    <div style={{
      ...style,
      position: 'relative'
    }} {...props}>
      <canvas ref={ref} style={{
        height: '50vh'
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        backgroundColor: 'black'
      }}>
        <Typography use="body1" style={{ color: 'white' }}>ID: {peer.id}</Typography>
      </div>
    </div>
  );
});

export default PeerDisplay;