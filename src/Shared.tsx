import {
    useParams,
    useNavigate,
    useSearchParams
  } from "react-router-dom";
import { useEffect, useState } from "react";
import * as Supa from './Supa'
import * as LocalState from "./LocalState";

export default function Shared() {
    const navigate = useNavigate();
    let uuid = useParams().id!;
    let [code, setCode] = useState<string | null>(uuid);
    useEffect(() => {
    (async () => {
        let {data, error} = await Supa.supabase.from('shared').select('*').eq('uuid', uuid)
        if (data && data.length) {
            setCode(JSON.stringify(data[0], null, 2))

            let prompt = data[0].prompt as string
            let response = data[0].response as string
            let filename = data[0].name as string
            let savedFiles = await LocalState.loadSavedFiles()

            await LocalState.saveCode(savedFiles, filename, prompt, response, true)
            navigate('/edit/' + filename)
        }
    })()
    }, [uuid])
    return <pre>Loading {code}</pre>
}