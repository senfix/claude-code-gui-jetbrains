interface Props {
    error: Error;
}

export const DefaultErrorBanner = (props: Props) => {
    const { error } = props;

    return (
        <div className="mx-4 my-2 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error.message}
        </div>
    );
};
