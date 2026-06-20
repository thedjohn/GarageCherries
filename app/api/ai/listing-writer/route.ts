import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { year, make, model, engine, displacement, cylinders, horsepower, torque,
    forcedInduction, fuelType, transmission, numSpeeds, driveType,
    color, interiorColor, seatMaterial, seatingType, bodyStyle,
    mileage, condition, location } = body;

  const specs = [
    `${year} ${make} ${model}`,
    bodyStyle && `Body: ${bodyStyle}`,
    color && `Color: ${color}`,
    mileage && `Mileage: ${Number(mileage).toLocaleString()} miles`,
    condition && `Condition: ${condition}`,
    engine && `Engine: ${engine}`,
    displacement && `Displacement: ${displacement}`,
    cylinders && `Cylinders: ${cylinders}`,
    horsepower && `Horsepower: ${horsepower} hp`,
    torque && `Torque: ${torque} lb-ft`,
    forcedInduction && forcedInduction !== 'None' && `Forced Induction: ${forcedInduction}`,
    fuelType && `Fuel: ${fuelType}`,
    transmission && `Transmission: ${transmission}`,
    numSpeeds && `Speeds: ${numSpeeds}`,
    driveType && `Drive: ${driveType}`,
    interiorColor && `Interior Color: ${interiorColor}`,
    seatMaterial && `Seat Material: ${seatMaterial}`,
    seatingType && `Seating: ${seatingType}`,
    location && `Location: ${location}`,
  ].filter(Boolean).join('\n');

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Write a compelling 2-3 paragraph listing description for this classic car. Be enthusiastic but accurate. Highlight what makes this car special to collectors and enthusiasts. Do not make up specs not listed below. Write in second-person perspective ("This [car]..."). Do not include a headline.\n\nSpecs:\n${specs}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return NextResponse.json({ description: text });
}
