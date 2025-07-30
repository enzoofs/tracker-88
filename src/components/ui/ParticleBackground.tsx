import React from 'react';

interface ParticleBackgroundProps {
  className?: string;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ className = "" }) => {
  return (
    <div className={`fixed inset-0 pointer-events-none ${className}`}>
      <div className="particles-container">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
      
      <style>{`
        .particles-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: linear-gradient(45deg, hsl(217 91% 60% / 0.3), hsl(262 83% 58% / 0.3));
          border-radius: 50%;
          animation: float linear infinite;
          box-shadow: 0 0 10px hsl(217 91% 60% / 0.2);
        }
        
        .particle:nth-child(odd) {
          background: linear-gradient(45deg, hsl(262 83% 58% / 0.2), hsl(217 91% 60% / 0.2));
          box-shadow: 0 0 8px hsl(262 83% 58% / 0.15);
        }
        
        .particle:nth-child(3n) {
          width: 2px;
          height: 2px;
          background: hsl(217 91% 60% / 0.15);
        }
        
        .particle:nth-child(5n) {
          width: 4px;
          height: 4px;
          background: hsl(262 83% 58% / 0.2);
        }
        
        @keyframes float {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        /* Add some horizontal drift */
        .particle:nth-child(even) {
          animation-name: floatDrift;
        }
        
        @keyframes floatDrift {
          0% {
            transform: translateY(100vh) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(50vh) translateX(20px) rotate(180deg);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) translateX(-20px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ParticleBackground;