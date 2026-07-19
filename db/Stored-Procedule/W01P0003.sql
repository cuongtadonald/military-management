IF EXISTS (SELECT TOP 1 1 FROM DBO.SYSOBJECTS WITH(NOLOCK) WHERE ID = OBJECT_ID(N'[DBO].[W01P0003]') AND OBJECTPROPERTY(ID, N'IsProcedure') = 1)
DROP PROCEDURE [DBO].[W01P0003]
GO
SET QUOTED_IDENTIFIER ON
GO
SET ANSI_NULLS ON
GO

-- <Summary>
---- Hien thi chi tiet
-- <Param>s
---- 
-- <Return>
---- 
-- <Reference>
---- 
-- <History>
---- Create on 19/06/2026 by NgocDuy  Hien Thi chi tiet quan nhan
---EXEC W01P0003 @SoldierID = 'S002' --câu test store


CREATE PROCEDURE W01P0003
( 
  @SoldierID VARCHAR(50),
  @Mode TINYINT 

) AS
IF (@Mode = 0 )
BEGIN 
 SELECT
        s.SoldierID,
        s.FullName,
        s.DateOfBirth,
        s.Gender,
        s.CitizenID,
		ou.UnitID,
        ou.UnitName,
		ou.FullPathName,
		ou.UnitShortName,
        s.Position,
        r.RankName,
        st.Description AS StatusName,

        s.Ethnicity,
        s.Religion,
        ms.MaritalStatusName,

        s.EducationLevel,
        s.Specialization,
        s.PoliticalLevel,

        s.BloodType,
        s.HealthClassification,

        s.Height,
        s.Weight,
        s.BloodPressure,

         s.Hometown,

        s.Address,
        w.WardName AS CurrentWard,
        p.ProvinceName AS CurrentProvince,

        s.EnlistmentDate,
        s.PartyJoinDate,
        s.YouthUnionJoinDate,

        s.PhotoPath,
        s.FileID,

        s.CreatedDate,
        s.CreatedBy,
        s.LastModifiedDate,
        s.LastModifiedBy,
		st.Description
    FROM Soldier s WITH(NOLOCK)
    LEFT JOIN OrganizationUnit ou WITH(NOLOCK)
        ON s.UnitID = ou.UnitID
    LEFT JOIN Rank r WITH(NOLOCK)
        ON s.RankID = r.RankID
    LEFT JOIN Status st WITH(NOLOCK)
        ON s.StatusID = st.StatusID
    LEFT JOIN MaritalStatus ms WITH(NOLOCK)
        ON s.MaritalStatusID = ms.MaritalStatusID
  
    LEFT JOIN Ward w WITH(NOLOCK)
        ON s.WardID = w.WardID
    LEFT JOIN Province p WITH(NOLOCK)
        ON s.ProvinceID = p.ProvinceID
    WHERE s.SoldierID = @SoldierID;
END
ELSE IF (@Mode = 1)
BEGIN
    -----------------------------------------------------------------
    -- 2. Thân nhân
    -----------------------------------------------------------------
    SELECT
        FamilyID,
        FullName,
        Relationship,
        DateOfBirth,
        Occupation,
        Workplace,
        PhoneNumber,
        Address,
        IsDependent
    FROM SoldierFamily
    WHERE SoldierID = @SoldierID
    ORDER BY CASE Relationship
        WHEN N'Cha' THEN 1
        WHEN N'Mẹ' THEN 2
        WHEN N'Bố' THEN 1
        WHEN N'Vợ' THEN 3
        WHEN N'Chồng' THEN 3
        WHEN N'Con' THEN 4
        WHEN N'Con trai' THEN 4
        WHEN N'Con gái' THEN 5
        WHEN N'Anh' THEN 6
        WHEN N'Anh ruột' THEN 6
        WHEN N'Chị' THEN 7
        WHEN N'Chị ruột' THEN 7
        WHEN N'Em' THEN 8
        WHEN N'Em trai' THEN 8
        WHEN N'Em gái' THEN 9
        ELSE 99
    END, FullName;
END
ELSE IF (@Mode = 2)
BEGIN
    ---------------------------------------------------------------
    --3. Lịch sử thay đổi
    ---------------------------------------------------------------
    SELECT
        h.HistoryID,
        h.FieldName,
        h.FieldDisplayName,
        h.OldValue,
        h.NewValue,
        h.ChangeType,
        h.ChangeReason,
        h.ChangeDate,
        u.FullName AS ChangedBy
    FROM SoldierHistory h
        LEFT JOIN [User] u ON h.ChangedBy = u.UserID
    WHERE h.SoldierID = @SoldierID
    ORDER BY h.ChangeDate DESC;

END
ELSE IF (@Mode = 3)
BEGIN
    -----------------------------------------------------------------
    -- 2. Quá trình công tác
    -----------------------------------------------------------------
    SELECT
        wp.WorkProcessID,
        wp.FromDate,
        wp.ToDate,
        wp.WorkDescription,
        wp.RankID,
        r.RankName,
        wp.PartyPosition,
        wp.Description
    FROM SoldierWorkProcess wp WITH(NOLOCK)
        LEFT JOIN Rank r WITH(NOLOCK)
            ON wp.RankID = r.RankID
    WHERE wp.SoldierID = @SoldierID
    ORDER BY wp.FromDate DESC;
END

ELSE IF (@Mode = 4)
BEGIN
    -----------------------------------------------------------------
    -- 3. Quá trình đào tạo
    -----------------------------------------------------------------
    SELECT
        tp.TrainingID,
        tp.SchoolName,
        tp.MajorName,
        tp.FromDate,
        tp.ToDate,
        tp.TrainingType,
        tp.Certificate,
        tp.Description
    FROM SoldierTrainingProcess tp WITH(NOLOCK)
    WHERE tp.SoldierID = @SoldierID
    ORDER BY tp.FromDate DESC;
END
GO
SET QUOTED_IDENTIFIER OFF
GO
SET ANSI_NULLS ON
GO

