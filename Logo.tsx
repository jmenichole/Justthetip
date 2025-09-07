import React from 'react';

export const Logo = () => {
  return (
    <div className="flex flex-col justify-center items-center mb-4 relative z-10">
      {/* 
        Using the provided PNG image for the logo. 
        Assuming the image is placed in the public folder as /logo.png 
      */}
      <img 
        src="/logo.png" 
        alt="JustTheTip Logo - an iceberg with the text 'JustTheTip' above it" 
        className="w-64 h-64 md:w-80 md:h-80 object-contain"
      />
    </div>
  );
};
