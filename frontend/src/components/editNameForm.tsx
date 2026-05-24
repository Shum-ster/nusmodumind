"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
interface EditNameFormProps {
  id: number;
  name: string;
  university: string;
}

const EditNameForm=({id, name, university}:EditNameFormProps)=>{
    const [newName, setNewName]= useState(name||"");
    const [newUniveristy, setNewUniveristy]= useState(university||"");
    const router = useRouter();

  const handleSubmit = async (e:React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newName.trim() || !newUniveristy.trim()) {
        alert("Both fields are required.");
    
        return;
      }

    try {
      const res = await fetch(`http://localhost:3001/names/${id}`, {
        method: "PUT",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({ name: newName, university: newUniveristy }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      router.refresh();
      router.push("/");
    } catch (error) {
      console.log(error);
    }
  };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className="border border-slate-600 px-8 py-2" type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)}/>
        <input className="border border-slate-600 px-8 py-2" type="text" placeholder="University Name" value={newUniveristy} onChange={(e)=> setNewUniveristy(e.target.value)}/>
        <button className="bg-slate-100 font-bold py-3 px-6 w-fit" type="submit">Update Name</button>
    </form>
    )
}
export default EditNameForm;