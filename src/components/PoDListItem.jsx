import React from 'react';
import ReactPlayer from 'react-player';
import '../styles/PoDListItem.css';

// This function is designed to get a better sense of how the 'ReactPlayer' Component works.
const reactPlayerTestFunction = (res) => {
  console.log(res);
};

function PoDListItem({ pod }) {
  const isVideo = pod.media_type === 'video';

  return (
    <div className='PoDListItem'>
      <h2>
        {`${pod.date}`} NASA PoD: {pod.title}
      </h2>
      {isVideo ? (
        <div className='PoDListItem-video-wrapper'>
          <ReactPlayer
            onReady={reactPlayerTestFunction(pod)}
            url={pod.url}
            light={true}
          />
        </div>
      ) : (
        <div className='PoDListItem-image-wrapper'>
          <img src={pod.url} alt={pod.title} />
        </div>
      )}
      <p>{pod.explanation}</p>
    </div>
  );
}

export default PoDListItem;
