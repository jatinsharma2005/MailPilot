import React from 'react';
import { PriorityType } from '../../types/index.js';

interface Props {
  priority: PriorityType;
}

export const PriorityBadge: React.FC<Props> = ({ priority }) => {
  switch (priority) {
    case 'URGENT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FBEBE9] text-[#B75C52] border border-[#F5D5D1]">
          URGENT
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FDF6EC] text-[#B7833D] border border-[#F3E2C8]">
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFEEE8] text-[#55584F]">
          MED
        </span>
      );
    case 'LOW':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal text-[#8E9086]">
          LOW
        </span>
      );
  }
};
