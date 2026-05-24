import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity({name: 'AllNames'})
export class Name{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    university: string;
}