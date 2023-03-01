import React from 'react';
import PoDListItem from './PoDListItem';
import '../styles/PoDList.css';

function PoDList({ pods }) {
  return (
    <div className='PoDList'>
      {pods.map((pod) => (
        <PoDListItem key={pod.date} pod={pod} />
      ))}
    </div>
  );
}

export default PoDList;
