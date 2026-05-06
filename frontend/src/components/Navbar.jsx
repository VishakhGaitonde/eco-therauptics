import React from 'react';

const pipeline1 = [
  { id: 'classifier', label: 'Classifier', icon: '🌿' },
  { id: 'shap', label: 'SHAP', icon: '🔍' },
  { id: 'dashboard', label: 'Overview', icon: '📊' },
];

const pipeline2 = [
  { id: 'forecast', label: 'Forecast', icon: '📈' },
  { id: 'scheduler', label: 'Scheduler', icon: '📅' },
];

const Navbar = ({ currentPage, setCurrentPage }) => {
  const renderPipeline = (steps, title, startIndex) => {
    const currentIndex = steps.findIndex(step => step.id === currentPage);
    
    return (
      <div className="pipeline-group">
        <div className="pipeline-title">{title}</div>
        <div className="nav-inner">
          {steps.map((step, index) => {
            let status = 'pending';
            // If the current page is in this pipeline, calculate status
            if (currentIndex !== -1) {
              if (index < currentIndex) status = 'done';
              else if (index === currentIndex) status = 'active';
            } else {
              // If the current page is in a LATER pipeline, all in this one are 'done'
              // This depends on the order. Pipeline 1 comes before Pipeline 2.
              const isAfterCurrent = pipeline2.some(s => s.id === currentPage) && title === "Analysis Pipeline";
              const isBeforeCurrent = pipeline1.some(s => s.id === currentPage) && title === "Forecasting Pipeline";
              
              if (isAfterCurrent) status = 'done';
              if (isBeforeCurrent) status = 'pending';
            }

            return (
              <React.Fragment key={step.id}>
                <div className={`step-item ${status}`} onClick={() => setCurrentPage(step.id)}>
                  <div className="step-box">
                    <div className="step-icon-wrapper">
                      {status === 'active' || status === 'done' ? (
                        <span className="step-emoji">{step.icon}</span>
                      ) : (
                        <span className="step-number">{startIndex + index + 1}</span>
                      )}
                    </div>
                    <span className="step-text">{step.label}</span>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`step-connector ${status === 'done' || (status === 'active' && false) ? 'done' : ''}`}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <nav className="pipeline-nav custom-theme multi-pipeline">
      {renderPipeline(pipeline1, "Analysis Pipeline", 0)}
      <div className="pipeline-separator">
        <div className="separator-line"></div>
        <div className="separator-icon">→</div>
        <div className="separator-line"></div>
      </div>
      {renderPipeline(pipeline2, "Forecasting Pipeline", 3)}
    </nav>
  );
};

export default Navbar;

