"use client";
import { HiOutlineTrash } from "react-icons/hi";
import { useRouter } from "next/navigation";


const RemoveBtn=({id}:{id:number})=>{
    const router =useRouter();

    const removeName= async()=>{
        const confirmed = confirm('Are you sure');
        if(confirmed){
            const res =await fetch(`http://localhost:3001/names/${id}`,{
                method:"DELETE",
    
            });
            if(res.ok){
                router.refresh();
                alert("deleted")
            }
        }
    }
    return(
        <button onClick={removeName} className="text-red-400">
            <HiOutlineTrash size={24}/>
        </button>
    )
}
export default RemoveBtn;