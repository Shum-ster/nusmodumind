import { Module } from "@nestjs/common";
import { NamesController } from "./names.controller";
import { NamesService } from "./names.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Name } from "src/entities/name.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Name])],
    controllers: [NamesController],
    providers: [NamesService],
})
export class NamesModule{}