import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input } from 'uspto-ds-react';

const agreementApiEndpoint = "https://api.na3.echosign.com/api/rest/v6/agreements";

const adobeAgreement: any = {
    "fileInfos": [
        {
            "libraryDocumentId": "CBJCHBCAABAA2clPzA6YD3Zwn1jUgVIo9--GIZCvUVUy"
        }
    ],
    "name": "Sample USPTO Agreement",
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

interface Event {
    id: string,
    date: string,
    description: String
}

export interface SignPoCProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> { }

export const SignPoC: React.FC<SignPoCProps> = ({ ...props }) => {
    const [status, setStatus] = useState("IN_PROCESS");
    const [aId, setAId] = useState("");
    const [docId, setDocId] = useState("");
    const [busy, setBusy] = useState(false);
    const [sEmail, setSEmail] = useState("");
    const [pEmail, setPEmail] = useState("");
    const [s2Email, setS2Email] = useState("");
    const [auth, setAuth] = useState("NONE");
    const [auth2, setAuth2] = useState("NONE");
    const [events, setEvents]: [Event[], Function] = useState([]);

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
            alert("Error retrieving document. Check console for details.");
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

            fetch(`${agreementApiEndpoint}/${id}/events`, getOptions)
                .then(response => {
                    return response.json()
                }).then(data => {
                    setEvents(data?.events || []);
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
                        "email": sEmail,
                        "securityOption": {
                            "authenticationMethod": auth
                        }
                    }
                ]
            }
        ]

        if (s2Email) {
            agreement.participantSetsInfo.push({
                "order": 2,
                "role": "SIGNER",
                "memberInfos": [
                    {
                        "email": s2Email,
                        "securityOption": {
                            "authenticationMethod": auth2
                        }
                    }
                ]
            })
        }

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
            alert("Error sending. Check console for details.");
            setBusy(false);
        }
    }, [waitForSign, sEmail, pEmail, auth, s2Email, auth2]);

    return (
        <div {...props} className='App-header'>
            <h1 style={{ margin: 20 }}>Adobe Acrobat Sign Proof of Concept</h1>
            {
                busy &&
                <div>
                    <h3>Agreement Status: </h3>
                    <h3 style={{ color: 'lightblue' }}>{status}</h3>
                    {
                        docId &&
                        <>
                            <Button
                                variant="success"
                                style={{ margin: 20 }}
                                onClick={getDocument}
                            >
                                Download Agreement
                            </Button>
                        </>
                    }
                    <fieldset style={{ minWidth: '50vw' }}>
                        <legend>Activity</legend>
                        <ol>
                            {
                                events.map((event) => {
                                    const dt = new Date(event.date)
                                    return (
                                        <li key={event.id} style={{ marginBottom: 10 }}>
                                            <span style={{ color: 'lightgray' }}>{dt.toDateString()} {dt.toTimeString()}</span>
                                            <br />
                                            {event.description}
                                        </li>
                                    )
                                })
                            }
                        </ol>
                    </fieldset>
                </div>
            }
            {
                !busy &&
                <>
                    <div style={{ margin: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className='row'>
                            <fieldset>
                                <legend>Applicant 1</legend>
                                <p style={{ marginTop: -20, color: 'lightgray' }}>Will sign the agreement first</p>
                                <Input
                                    type="email"
                                    labelText='Email'
                                    onChange={e => setSEmail(e.target.value)}
                                />
                                <label htmlFor='authMethod'>Authentication Method</label>
                                <select id="authMethod" className='form-control' value={auth} onChange={e => setAuth(e.target.value)}>
                                    <option value="NONE">None (Email Only)</option>
                                    <option value="KBA">Knowledge-Based (KBA)</option>
                                </select>
                            </fieldset>
                            <fieldset>
                                <legend>Applicant 2 (Optional)</legend>
                                <p style={{ marginTop: -20, color: 'lightgray' }}>Will sign the agreement after Applicant 1</p>
                                <Input
                                    type="email"
                                    labelText='Email'
                                    onChange={e => setS2Email(e.target.value)}
                                />
                                <label htmlFor='authMethod'>Authentication Method</label>
                                <select id="authMethod" className='form-control' value={auth} onChange={e => setAuth2(e.target.value)}>
                                    <option value="NONE">None (Email Only)</option>
                                    <option value="KBA">Knowledge-Based (KBA)</option>
                                </select>
                            </fieldset>
                        </div>
                        <div className="row">
                            <fieldset>
                                <legend>Agent / Attorney</legend>
                                <p style={{ marginTop: -20, color: 'lightgray' }}>Will receive signing notification</p>
                                <Input
                                    type="email"
                                    labelText='Email'
                                    onChange={e => setPEmail(e.target.value)}
                                />
                            </fieldset>
                        </div>
                        <Button
                            onClick={sendAgreement}
                            style={{ margin: 5 }}
                        >
                            Send Agreement
                        </Button>
                    </div>
                </>
            }
        </div>
    )
}