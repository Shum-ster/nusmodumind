import EditNameForm from "@/components/editNameForm";

const getNamebyid= async(id:number)=>{
    try{
        const res= await fetch(`http://localhost:3001/names/${id}`,{
            cache:"no-store",
        });
        if(!res.ok){
            throw new Error("Failed to fetch");
        }
        const data= await res.json();
        return data;
    } catch (error){
        console.log(error);
    }
}

const EditName= async ({params}:{ params: { id: string } })=>{
    interface NameData {
        name: string;
        university: string;
    }
    const{id}= params;
    const idNum = parseInt(id as string, 10);
    const data:NameData= await getNamebyid(idNum);
    const{name, university}= data;
    console.log("id:",idNum)
    return (
        <EditNameForm id={idNum} name={name} university={university}/>
    );
}
export default EditName;