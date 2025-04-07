const ProgressBar = ({ seconds, totalSeconds }) => {
  // Calculate percentage
  const percentage = (seconds / totalSeconds) * 100;
  
  // Determine color based on time remaining
  let colorClass = "progress-green";
  if (seconds <= 10) {
    colorClass = "progress-red";
  } else if (seconds <= 20) {
    colorClass = "progress-yellow";
  }
  
  return (
    <div className="progress-container">
      <div 
        className={`progress-bar ${colorClass}`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
