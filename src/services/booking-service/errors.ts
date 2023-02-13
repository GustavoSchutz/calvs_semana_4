import { ApplicationError } from "@/protocols";

export function roomCapacityError(): ApplicationError {
  return {
    name: "roomCapacityError",
    message: "selected room is out of capacity",
  };
}
