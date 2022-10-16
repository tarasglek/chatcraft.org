import {
    useParams,
    useNavigate,
    useSearchParams
  } from "react-router-dom";
import { useEffect, useState } from "react";
import * as Supa from './Supa'

export default function Shared() {
    const navigate = useNavigate();
    let uuid = useParams().id!;
    let [code, setCode] = useState<string | null>(uuid);
    useEffect(() => {
    (async () => {
        let {data, error} = await Supa.supabase.from('shared').select('*').eq('uuid', uuid)
        setCode(JSON.stringify(data, null, 2))
    })()
    }, [uuid])
    return <pre>Loading {code}</pre>
}