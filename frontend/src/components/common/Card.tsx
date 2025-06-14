// frontend/src/components/common/Card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleClassName?: string;
  footerContent?: React.ReactNode;
  onClick?: () => void; // Optional click handler for the whole card
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  titleClassName = 'text-xl font-semibold text-gray-700 mb-4 pb-2 border-b',
  footerContent,
  onClick,
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {title && <h2 className={titleClassName}>{title}</h2>}
      <div>{children}</div>
      {footerContent && <div className="mt-6 pt-4 border-t border-gray-200">{footerContent}</div>}
    </div>
  );
};

export default Card;