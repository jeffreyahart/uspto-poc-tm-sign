import React from 'react';

export interface SignPoCProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {

}

export const SignPoC: React.FC<SignPoCProps> = ({ ...props }) => {


    return (
        <div {...props}>

        </div>
    )
}