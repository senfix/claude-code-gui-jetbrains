import {HTMLProps, ReactNode} from "react";

interface Props extends HTMLProps<HTMLButtonElement> {
    type?: "submit" | "reset" | "button" | undefined;
    className?: string;
    children?: ReactNode;
    onClick?: () => any;
}

export function Tag(props: Props) {
    const {type = 'button', title = '', className = '', children, onClick, ...res} = props;

    return (
        <button
            type={type}
            className={`
                inline-flex items-center gap-1 px-1 py-[2px] rounded
                text-[11px] font-medium text-zinc-400 transition-colors
                cursor-pointer hover:bg-white/[7%]
                ${className}
            `}
            title={title}
            onClick={onClick}
            {...res}
        >
            {children}
        </button>
    )
}