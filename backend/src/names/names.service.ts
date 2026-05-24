import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Name } from "src/entities/name.entity";
import { Repository } from "typeorm";
import { AddNameParams, UpdateNameParams } from "./utils/types";

@Injectable()
export class NamesService{
    constructor(@InjectRepository(Name) private nameRepository: Repository<Name>,){}

    findnames(){
        return this.nameRepository.find();
    }
    findname(id:number){
        return this.nameRepository.findBy({id})
    }
    addName(addnamedetails:AddNameParams){
        const newName= this.nameRepository.create({...addnamedetails });
        return this.nameRepository.save(newName);
    }
    editName(id:number ,updatenamedetails:UpdateNameParams){
        return this.nameRepository.update({id}, { ...updatenamedetails});
    }
    delelteName(id:number){
        return this.nameRepository.delete({id})
    }
}