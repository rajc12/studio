import { SVGProps } from "react";

export const SkipSymbol = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="12" />
        <line x1="25" y1="75" x2="75" y2="25" stroke="currentColor" strokeWidth="12" />
    </svg>
);

export const ReverseSymbol = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 10L3 14L7 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 14L21 10L17 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 10H5C4.46957 10 3.96086 10.2107 3.58579 10.5858C3.21071 10.9609 3 11.4696 3 12V13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 14H19C19.5304 14 20.0391 13.7893 20.4142 13.4142C20.7893 13.0391 21 12.5304 21 12V11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const DrawTwoSymbol = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="40" height="60" rx="5" stroke="currentColor" strokeWidth="8"/>
        <rect x="40" y="30" width="40" height="60" rx="5" stroke="currentColor" strokeWidth="8" fill="rgba(0,0,0,0.2)" />
    </svg>
);

export const WildSymbol = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 108 76" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M54 38C24.1766 38 0 29.4934 0 19C0 8.50659 24.1766 0 54 0C83.8234 0 108 8.50659 108 19C108 29.4934 83.8234 38 54 38Z" fill="#F44336"/>
        <path d="M54 38C83.8234 38 108 46.5066 108 57C108 67.4934 83.8234 76 54 76C24.1766 76 0 67.4934 0 57C0 46.5066 24.1766 38 54 38Z" fill="#FFEB3B"/>
        <path opacity="0.8" d="M54 38C38.0263 52.6111 25.5 57 0 57C25.5 57 38.0263 23.3889 54 38Z" fill="#2196F3"/>
        <path opacity="0.8" d="M54 38C69.9737 23.3889 82.5 19 108 19C82.5 19 69.9737 52.6111 54 38Z" fill="#4CAF50"/>
    </svg>
);


export const DrawFourSymbol = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 108 76" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M54 38C24.1766 38 0 29.4934 0 19C0 8.50659 24.1766 0 54 0C83.8234 0 108 8.50659 108 19C108 29.4934 83.8234 38 54 38Z" fill="#2196F3"/>
    <path d="M54 38C83.8234 38 108 46.5066 108 57C108 67.4934 83.8234 76 54 76C24.1766 76 0 67.4934 0 57C0 46.5066 24.1766 38 54 38Z" fill="#4CAF50"/>
    <path opacity="0.8" d="M54 38C38.0263 52.6111 25.5 57 0 57C25.5 57 38.0263 23.3889 54 38Z" fill="#F44336"/>
    <path opacity="0.8" d="M54 38C69.9737 23.3889 82.5 19 108 19C82.5 19 69.9737 52.6111 54 38Z" fill="#FFEB3B"/>
    <text x="54" y="47" fontFamily="sans-serif" fontSize="24" fill="white" textAnchor="middle" fontWeight="bold">+4</text>
  </svg>
);