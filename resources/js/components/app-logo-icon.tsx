import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {/* マイク部分 */}
            <path
                d="M12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2Z"
                fill="currentColor"
            />
            {/* マイクスタンド */}
            <path
                d="M17 11C17 14.31 14.31 17 11 17H13C16.31 17 19 14.31 19 11H17ZM5 11C5 14.31 7.69 17 11 17H13C9.69 17 7 14.31 7 11H5Z"
                fill="currentColor"
                opacity="0.7"
            />
            {/* ドキュメント/議事録部分 */}
            <path
                d="M19 19H5C4.45 19 4 19.45 4 20C4 20.55 4.45 21 5 21H19C19.55 21 20 20.55 20 20C20 19.45 19.55 19 19 19Z"
                fill="currentColor"
            />
            <path
                d="M12 17V19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            {/* 音波エフェクト */}
            <path
                d="M18 6C18.55 6 19 6.45 19 7C19 9.76 16.76 12 14 12C13.45 12 13 11.55 13 11C13 10.45 13.45 10 14 10C15.66 10 17 8.66 17 7C17 6.45 17.45 6 18 6Z"
                fill="currentColor"
                opacity="0.5"
            />
            <path
                d="M6 6C5.45 6 5 6.45 5 7C5 9.76 7.24 12 10 12C10.55 12 11 11.55 11 11C11 10.45 10.55 10 10 10C8.34 10 7 8.66 7 7C7 6.45 6.55 6 6 6Z"
                fill="currentColor"
                opacity="0.5"
            />
        </svg>
    );
}
