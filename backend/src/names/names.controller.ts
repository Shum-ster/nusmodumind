import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { AddNameDto } from "src/names/dtos/AddName.dto";
import { NamesService } from "./names.service";
import { EditNameDto } from "./dtos/EditName.dto";

@Controller('names')
export class NamesController{
    constructor(private nameservice: NamesService){}

    @Get()
    async findnames(){
        return await this.nameservice.findnames();
    }
    @Get(':id')
    async findname(
        @Param('id', ParseIntPipe) id:number
    ){
        return await this.nameservice.findname(id)
    }

    @Post()
    async addName(@Body() addnameDto:AddNameDto){
        const{...addnamedetails}= addnameDto;
        console.log("got request")
        return await this.nameservice.addName(addnameDto)
    }

    @Put(':id')
    async editName(
        @Param('id', ParseIntPipe) id: number,
        @Body() editnameDto: EditNameDto,
    ){
        await this.nameservice.editName(id,editnameDto)
    }

    @Delete(':id')
    async deleteName(
        @Param('id',ParseIntPipe ) id:number,
    ){
        await this.nameservice.delelteName(id)
    }
}