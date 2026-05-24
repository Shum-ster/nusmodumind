import Link from "next/link"

const Navbar=()=>{
    return (
        <nav className="flex justify-between items-center bg-cyan-100 px-8 py-3">
            <Link className="text-black font-bold" href={"/"}>CRUD excercise</Link>
            <Link className="bg-white p-2" href={"/addName"}>Add Name</Link>
        </nav>
    )
}
export default Navbar;