"use client";
import {useState} from 'react';
import { useRouter } from 'next/navigation';


const AddName=()=>{
  const router = useRouter();

  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!name.trim() || !university.trim()) {
      alert("Both fields are required.");
      setIsSubmitting(false);
      return;
    }

    const data = { name, university };

    try {
      const res = await fetch("http://localhost:3001/names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(`Failed to submit. Status: ${res.status}`);
      }

      const result = await res.json();
      console.log("Submission successful:", result);
      router.refresh();
      router.push("/");
      alert("name Submitted")

  
    } catch (err) {
      console.error("Error submitting the form:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };



    return <form onSubmit={handleSubmit}   className="flex flex-col gap-3">
        <input className="border border-slate-600 px-8 py-2" type="text" name="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}/>
        <input className="border border-slate-600 px-8 py-2" type="text" name="university" placeholder="University Name" value={university} onChange={(e)=>setUniversity(e.target.value)}/>
        <button className="bg-slate-100 font-bold py-3 px-6 w-fit" type="submit">Add Name</button>
    </form>
}
export default AddName;