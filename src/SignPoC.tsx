import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input } from 'uspto-ds-react';

const agreementApiEndpoint = "https://api.na3.echosign.com/api/rest/v6/agreements";

const adobeAgreement: any = {
    "fileInfos": [
        {
            "libraryDocumentId": "CBJCHBCAABAA2clPzA6YD3Zwn1jUgVIo9--GIZCvUVUy"
        }
    ],
    "name": "Test Agreement",
    "participantSetsInfo": [

    ],
    "signatureType": "ESIGN",
    "message": "Please sign this form for testing purposes.",
    "reminderFrequency": "DAILY_UNTIL_SIGNED",
    "state": "IN_PROCESS"
}

const fetchHeaders = {
    "accept": "*/*",
    "Content-Type": "application/json",
    "Authorization": "Bearer 3AAABLblqZhCgRVWHjTc5HpjVRizL2wHA0HGauTI681ul61LiHWhPlp1-3AgiljZRdjnTdt1AG0-y5caqIbi7Dl9mLq7v-M_C"
}

const getOptions = {
    headers: fetchHeaders
}

export interface SignPoCProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {

}

export const SignPoC: React.FC<SignPoCProps> = ({ ...props }) => {
    const [status, setStatus] = useState("IN_PROCESS");
    const [aId, setAId] = useState("");
    const [docId, setDocId] = useState("");
    const [busy, setBusy] = useState(false);
    const [sName, setSName] = useState("");
    const [sEmail, setSEmail] = useState("");
    const [pEmail, setPEmail] = useState("");

    // Download the current agreement PDF
    const getDocument = useCallback(async () => {
        const endpoint = `${agreementApiEndpoint}/${aId}/documents/${docId}`;
        const response = await fetch(endpoint, getOptions);
        if (response.ok) {
            const data = await response.blob();
            var downloadURL = window.URL.createObjectURL(data);
            var link = document.createElement('a');
            link.href = downloadURL;
            link.download = `Test Agreement [${status}].pdf`;
            link.click();
        } else {
            alert("Error retrieving document. Check log for details.");
        }
    }, [aId, docId, status])

    const getDocumentId = useCallback(async () => {
        if (!aId) return;

        const endpoint = `${agreementApiEndpoint}/${aId}/documents`;
        const response = await fetch(endpoint, getOptions);
        if (response.ok) {
            const data = await response.json();
            const doc: { id: string } = data?.documents?.pop();
            if (doc) {
                setDocId(doc?.id);
            }
        }
    }, [aId]);

    // Get document Id when status changes
    useEffect(() => {
        setTimeout(getDocumentId, 2000);
    }, [status, getDocumentId]);

    // Update status every 5 secs until SIGNED
    const waitForSign = useCallback(async (id: string) => {
        if (!id) return;

        const interval = setInterval(() => {
            fetch(`${agreementApiEndpoint}/${id}`, getOptions)
                .then(response => {
                    return response.json()
                }).then(data => {
                    const stat = data?.status;
                    setStatus(stat);
                    if (stat === "SIGNED")
                        clearInterval(interval);
                });
        }, 5000);
    }, []);

    const sendAgreement = useCallback(async () => {
        let agreement = Object.assign({}, adobeAgreement);

        agreement.participantSetsInfo = [
            {
                "order": 1,
                "role": "SIGNER",
                "memberInfos": [
                    {
                        "name": sName,
                        "email": sEmail
                    }
                ]
            }
        ]

        if (pEmail) {
            agreement.ccs = [
                {
                    email: pEmail
                }
            ]
        }

        const postOptions = {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify(agreement)
        }

        setBusy(true);

        const response = await fetch(agreementApiEndpoint, postOptions);

        if (response.ok) {
            const result = await response.json();
            setAId(result?.id);
            waitForSign(result?.id);
        } else {
            alert("Error sending. Check log for details.");
            setBusy(false);
        }
    }, [waitForSign, sName, sEmail, pEmail]);

    return (
        <div {...props} className='App-header'>
            <h1 style={{ margin: 20 }}>Adobe Sign Proof of Concept</h1>
            {
                busy &&
                <div>
                    <h3>Agreement Status: </h3>
                    <h3 style={{ color: 'lightblue' }}>{status}</h3>
                    {
                        docId &&
                        <Button
                            variant="success"
                            style={{ margin: 20 }}
                            onClick={getDocument}
                        >
                            Download Agreement
                        </Button>
                    }
                </div>
            }
            {
                !busy &&
                <>
                    <div style={{ margin: 20 }}>
                        <fieldset>
                            <legend>Signer</legend>
                            <Input
                                labelText='Name:'
                                onChange={e => setSName(e.target.value)}
                            />
                            <Input
                                type="email"
                                labelText='Email:'
                                onChange={e => setSEmail(e.target.value)}
                            />
                        </fieldset>
                        <fieldset>
                            <legend>Petitioner</legend>
                            <Input
                                type="email"
                                labelText='Email:'
                                onChange={e => setPEmail(e.target.value)}
                            />
                        </fieldset>
                    </div>
                    <Button
                        onClick={sendAgreement}
                    >
                        Send Agreement
                    </Button>
                </>
            }
        </div>
    )
}